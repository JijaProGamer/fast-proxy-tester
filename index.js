import useProxy from "puppeteer-page-proxy";
import proxy from "proxy-agent-v2";
import axios from 'axios';

class testInstance {
    #proxy_url
    #timeout = 30000

    constructor(proxy_url, timeout) {
        this.#proxy_url = proxy_url
        this.#timeout = timeout
    }

    testProxyURL(url) {
        let urlSplit = url.split("://")

        let protocol = urlSplit[0]
        url = urlSplit[1]

        if (url) {
            let proxy_url
            let proxy_port

            let username
            let password

            let splits = url.split(":")

            if (splits.length == 2) {
                proxy_url = splits[0]
                proxy_port = parseInt(splits[1])

                return {
                    isValid: true,
                    proxy_url, proxy_port,
                    protocol
                }
            }

            if (url.includes("@")) {
                if (splits.length !== 3) return {
                    isValid: false,
                    err: "Invalid URL"
                }

                splits = url.split("@")
                let account_splits = splits[0].split(":")
                let url_splits = splits[1].split(":")


                proxy_url = url_splits[0]
                proxy_port = parseInt(url_splits[1])

                username = account_splits[0]
                password = account_splits[1]
            } else {
                if (splits.length !== 4) return {
                    isValid: false,
                    err: "Invalid URL"
                }

                proxy_url = splits[0]
                proxy_port = parseInt(splits[1])

                username = splits[2]
                password = splits[3]
            }

            return {
                isValid: true,
                proxy_url, proxy_port,
                protocol,
                username, password,
            }
        } else {
            return {
                isValid: false,
                err: "No protocol specified"
            }
        }
    }

    fastTest(url) {
        return new Promise((resolve, reject) => {
            let isGoodProxy = this.testProxyURL(this.#proxy_url)
            if (!isGoodProxy.isValid) reject(new Error(isGoodProxy.err))

            let finalURL = `${isGoodProxy.protocol}://`

            if (isGoodProxy.username) {
                finalURL = `${finalURL}${isGoodProxy.username}:${isGoodProxy.password}@${isGoodProxy.proxy_url}:${isGoodProxy.proxy_port}`
            } else {
                finalURL = `${finalURL}${isGoodProxy.proxy_url}:${isGoodProxy.proxy_port}`
            }

            const httpsAgent = new proxy(finalURL);
            const client = axios.create({
                httpsAgent,
                httpAgent: httpsAgent,
            });

            let start = Date.now()

            client({
                method: "get",
                url: url,
                timeout: this.#timeout,
                headers: {
                    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
                }
            })
                .then((result) => {
                    resolve({
                        status: result.status,
                        data: result.data,
                        headers: result.headers,
                        latency: Date.now() - start,
                    })
                })
                .catch((error) => {
                    if (error.message.includes("time"))
                        return reject("timeout")

                    reject({
                        message: error.message,
                        status: error.response?.status,
                        data: error.response?.data,
                        headers: error.response?.headers,
                        latency: Date.now() - start,
                    })
                })


        })
    }

    test(url, chromePath, puppeteer) {
        return new Promise((resolve, reject) => {
            this.fastTest(url).then(() => {
                puppeteer.launch({
                    headless: "chrome",
                    executablePath: chromePath
                }).then(async (browser) => {
                    let page = await browser.newPage()
                    let start = Date.now()

                    page.setDefaultNavigationTimeout(this.#timeout);
                    page.setDefaultTimeout(this.#timeout);

                    let isGoodProxy = this.testProxyURL(this.#proxy_url)
                    let finalURL = `${isGoodProxy.protocol}://`

                    if (isGoodProxy.username) {
                        finalURL = `${finalURL}${isGoodProxy.username}:${isGoodProxy.password}@${isGoodProxy.proxy_url}:${isGoodProxy.proxy_port}`
                    } else {
                        finalURL = `${finalURL}${isGoodProxy.proxy_url}:${isGoodProxy.proxy_port}`
                    }

                    await page.setRequestInterception(true);
                    page.on('request', async request => {
                        await useProxy(request, finalURL);
                    });

                    page.goto(url, { waitUntil: "networkidle2" }).then(async (e) => {
                        resolve({
                            status: e.status(),
                            headers: e.headers(),
                            data: await page.content(),
                            latency: Date.now() - start
                        })

                        await browser.close()
                    }).catch((err) => {
                        console.log(err)
                    })
                }).catch(reject)
            }).catch(reject)
        })
    }

    testPrivacy() {
        return new Promise((resolve, reject) => {
            axios({
                method: "get",
                url: `https://lumtest.com/myip.json`,
                timeout: this.#timeout,
                headers: {
                    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
                }
            })
                .then((result) => {
                    let localData = result.data
                    let localIP = localData.ip

                    this.fastTest("https://lumtest.com/myip.json").then((remoteResult) => {
                        let remoteData = remoteResult.data
                        let remoteIP = remoteData.ip

                        resolve({
                            privacy: remoteIP !== localIP ? "elite" : "transparent",
                            ip: remoteIP,
                            geo: remoteData.geo,
                        })
                    }).catch((error) => {
                        reject(error)
                    })
                }).catch((error) => {
                    reject(error)
                })
        })
    }
}

function createProxyTester(proxy_url, timeout) {
    return new testInstance(proxy_url, timeout)
}

createProxyTester.testInstance = testInstance;
createProxyTester.proxyTester = createProxyTester;
createProxyTester.default = createProxyTester;

export { createProxyTester }
export default createProxyTester