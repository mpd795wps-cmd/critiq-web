import { Router } from 'express';
import crypto from 'node:crypto';

const router = Router();

const MARKETPLACE = 'www.amazon.co.jp';
const REGION = 'us-east-1';
const HOST = 'webservices.amazon.co.jp';
const PATH = '/paapi5/getitems';
const SERVICE = 'ProductAdvertisingAPI';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems';

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildHeaders(
  accessKey: string,
  secretKey: string,
  body: string,
  amzDate: string,
): Record<string, string> {
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256hex(body);

  // Sorted canonical headers
  const headerMap: Record<string, string> = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    host: HOST,
    'x-amz-date': amzDate,
    'x-amz-target': TARGET,
  };

  const sortedKeys = Object.keys(headerMap).sort();
  const signedHeaders = sortedKeys.join(';');
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headerMap[k]}`).join('\n') + '\n';

  const canonicalRequest = [
    'POST',
    PATH,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(Buffer.from(`AWS4${secretKey}`), dateStamp), REGION), SERVICE),
    'aws4_request',
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    ...headerMap,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

router.get('/amazon/:asin', async (req, res) => {
  const { asin } = req.params;

  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const associateTag = process.env.AMAZON_ASSOCIATE_TAG;

  if (!accessKey || !secretKey || !associateTag) {
    return res.json({ available: false, reason: 'credentials_not_configured' });
  }

  if (!asin) {
    return res.json({ available: false, reason: 'no_asin' });
  }

  const body = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      'ItemInfo.Features',
      'ItemInfo.ProductInfo',
      'ItemInfo.ManufactureInfo',
      'ItemInfo.ByLineInfo',
    ],
    PartnerType: 'Associates',
    PartnerTag: associateTag,
    Marketplace: MARKETPLACE,
    LanguagesOfPreference: ['ja_JP'],
  });

  // Format: YYYYMMDDTHHmmssZ
  const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

  try {
    const headers = buildHeaders(accessKey, secretKey, body, amzDate);
    const response = await fetch(`https://${HOST}${PATH}`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ available: false, reason: 'api_error', detail: text });
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = (data as any).ItemsResult?.Items as unknown[] | undefined;
    const item = items?.[0] as any;

    if (!item) {
      return res.json({ available: false, reason: 'item_not_found' });
    }

    const productInfo = item.ItemInfo?.ProductInfo;
    const dims = productInfo?.ItemDimensions;
    const specs: { label: string; value: string }[] = [];

    if (dims?.Height?.DisplayValue != null)
      specs.push({ label: '高さ', value: `${dims.Height.DisplayValue} ${dims.Height.Unit ?? ''}`.trim() });
    if (dims?.Width?.DisplayValue != null)
      specs.push({ label: '幅', value: `${dims.Width.DisplayValue} ${dims.Width.Unit ?? ''}`.trim() });
    if (dims?.Length?.DisplayValue != null)
      specs.push({ label: '奥行き', value: `${dims.Length.DisplayValue} ${dims.Length.Unit ?? ''}`.trim() });
    if (productInfo?.ItemWeightWithUnit?.DisplayValue)
      specs.push({ label: '重量', value: productInfo.ItemWeightWithUnit.DisplayValue });
    if (productInfo?.Color?.DisplayValue)
      specs.push({ label: 'カラー', value: productInfo.Color.DisplayValue });
    if (productInfo?.Material?.DisplayValue)
      specs.push({ label: '素材', value: productInfo.Material.DisplayValue });

    const manufactureInfo = item.ItemInfo?.ManufactureInfo;
    if (manufactureInfo?.Model?.DisplayValue)
      specs.push({ label: '型番', value: manufactureInfo.Model.DisplayValue });
    if (manufactureInfo?.Warranty?.DisplayValue)
      specs.push({ label: '保証', value: manufactureInfo.Warranty.DisplayValue });

    const features: string[] = item.ItemInfo?.Features?.DisplayValues?.slice(0, 6) ?? [];

    return res.json({ available: true, specs, features });
  } catch (e) {
    return res.status(500).json({ available: false, reason: 'internal_error' });
  }
});

export default router;
