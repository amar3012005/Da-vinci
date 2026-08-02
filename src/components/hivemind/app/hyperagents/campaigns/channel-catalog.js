export const CHANNEL_NAMES = {
  x_organic: 'X Organic Posts', gmail: 'Email', tara: 'TARA', x_ads: 'Paid X Ads', google_ads: 'Google Ads',
  meta: 'Meta Ads', linkedin: 'LinkedIn', linkedin_ads: 'LinkedIn Ads', instagram: 'Instagram', facebook: 'Facebook',
  tiktok: 'TikTok', youtube: 'YouTube', pinterest: 'Pinterest', reddit: 'Reddit', threads: 'Threads',
  bluesky: 'Bluesky', google_business: 'Google Business', youtube_ads: 'YouTube Ads', tiktok_ads: 'TikTok Ads',
  microsoft_ads: 'Microsoft Ads', apple_ads: 'Apple Ads', amazon_ads: 'Amazon Ads', reddit_ads: 'Reddit Ads',
  pinterest_ads: 'Pinterest Ads', snapchat_ads: 'Snapchat Ads',
};

export const CHANNEL_DESCRIPTIONS = {
  x_organic: 'Publish regular posts from the connected X account.',
  x_ads: 'Create, launch, pause, and measure paid X campaigns through the connected account.',
  meta: 'Create and operate paid campaigns across connected Meta ad accounts.',
  google_ads: 'Create and operate campaigns from the connected Google Ads account.',
  linkedin_ads: 'Create and operate campaigns from the connected LinkedIn advertiser account.',
};

export const CAMPAIGN_CHANNEL_IDS = Object.freeze(Object.keys(CHANNEL_NAMES));

export const PAID_CHANNEL_IDS = new Set([
  'x_ads', 'google_ads', 'meta', 'linkedin_ads', 'youtube_ads', 'tiktok_ads',
  'microsoft_ads', 'apple_ads', 'amazon_ads', 'reddit_ads', 'pinterest_ads', 'snapchat_ads',
]);
