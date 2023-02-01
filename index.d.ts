interface geoData {
    city: string,
    region: string,
    region_name: string,
    postal_code: string,
    latitude: number,
    longitude: number,
    tz: string,
    lum_city: string,
    lum_region: string,
}

interface testResults {
    latency: number;
    status: number;
    data: string;
    headers: Object;
}

interface privacyResult {
    privacy: string;
    ip: string;
    geo: geoData;
}

interface validResult {
    isValid: boolean;
    err?: string;
    proxy_url?: string;
    proxy_port?: string;
    protocol?: string;
    username?: string;
    password?: string;
}

export const privacyResult = "transparent" | "elite";

export class testInstance {
    testProxyURL(url: string): validResult;
    testPrivacy(): Promise<privacyResult>;
    fastTest(url: string): Promise<testResults>;
    test(url: string, chromePath: string, puppeteer: any): Promise<testResults>;
}

export function createProxyTester(proxy_url: string, timeout: number): testInstance