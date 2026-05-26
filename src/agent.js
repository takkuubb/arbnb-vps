const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `あなたは「アルベちゃん」という名前のAirbnb民泊管理専門のAI秘書です。
オーナーをサポートするため、収益データの分析・要約・アドバイスを日本語で行います。

性格:
- 丁寧でプロフェッショナル、でも親しみやすい
- データに基づいた的確な分析をする
- 必要に応じて改善提案やアドバイスを行う
- 絵文字を適度に使って読みやすくする

できること:
- 収益・売上の分析・集計
- ゲスト情報の確認・傾向分析
- 月次・年次レポートの要約
- 稼働率・平均単価などの計算
- 今後の戦略についてのアドバイス

データ形式の説明:
- amount_value: 支払金額（円）
- guest_name: ゲスト名
- nationality: 国籍
- nights: 宿泊数
- stay_start/stay_end: 滞在期間
- guests_total: 合計ゲスト数
- listing_title: 物件名
- payout_date: 支払日
`;

function buildContext(payouts) {
  if (!payouts || payouts.length === 0) return 'データなし';

  const total = payouts.length;
  const totalAmt = payouts.reduce((s, p) => s + (p.amount_value || 0), 0);
  const totalNights = payouts.reduce((s, p) => s + (p.nights || 0), 0);
  const avgPerNight = totalNights > 0 ? Math.round(totalAmt / totalNights) : 0;

  const byNat = {};
  payouts.forEach(p => {
    const n = p.nationality || '不明';
    byNat[n] = (byNat[n] || 0) + 1;
  });
  const natRanking = Object.entries(byNat).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([n, c]) => `${n}:${c}件`).join(', ');

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyPayouts = payouts.filter(p => p.payout_date && p.payout_date.startsWith(thisMonth));
  const monthlyAmt = monthlyPayouts.reduce((s, p) => s + (p.amount_value || 0), 0);

  const recent10 = payouts.slice(0, 10).map(p =>
    `・${p.guest_name || '?'} / ${p.nationality || '?'} / ${p.nights || '?'}泊 / ¥${(p.amount_value || 0).toLocaleString()} / ${(p.payout_date || '').slice(0, 10)}`
  ).join('\n');

  return `
=== 現在のデータサマリー ===
総予約件数: ${total}件
合計収益: ¥${totalAmt.toLocaleString()}
今月収益: ¥${monthlyAmt.toLocaleString()}（${monthlyPayouts.length}件）
平均1泊単価: ¥${avgPerNight.toLocaleString()}
国籍別ランキング: ${natRanking}

=== 直近10件 ===
${recent10}
`;
}

async function chat(messages, userMessage) {
  const payouts = db.getPayouts({ limit: 500 });
  const context = buildContext(payouts);

  const systemWithContext = SYSTEM_PROMPT + '\n\n' + context;

  const apiMessages = [
    ...messages,
    { role: 'user', content: userMessage }
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemWithContext,
    messages: apiMessages,
  });

  return response.content[0].text;
}

module.exports = { chat };
