export const CHANNEL_NAMES = {
  x_organic: 'X', gmail: 'Email', tara: 'TARA', x_ads: 'X Ads', google_ads: 'Google Ads',
  meta: 'Meta Ads', linkedin: 'LinkedIn', youtube_ads: 'YouTube Ads', tiktok_ads: 'TikTok Ads',
  microsoft_ads: 'Microsoft Ads', apple_ads: 'Apple Ads', amazon_ads: 'Amazon Ads', reddit_ads: 'Reddit Ads',
  pinterest_ads: 'Pinterest Ads', snapchat_ads: 'Snapchat Ads',
};

export const CAMPAIGN_CHANNEL_IDS = Object.freeze(Object.keys(CHANNEL_NAMES));

export const PAID_CHANNEL_IDS = new Set([
  'x_ads', 'google_ads', 'meta', 'linkedin', 'youtube_ads', 'tiktok_ads',
  'microsoft_ads', 'apple_ads', 'amazon_ads', 'reddit_ads', 'pinterest_ads', 'snapchat_ads',
]);
