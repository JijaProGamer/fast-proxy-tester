import useProxy from "puppeteer-page-proxy";
import proxy from "proxy-agent-v2";
import axios from 'axios';

function doRequest(proxyURL, outgoingURL, timeout){
    if(proxyURL && proxyURL !== "direct://"){
        const httpsAgent = new proxy(proxyURL);
        const client = axios.create({
            httpsAgent,
            httpAgent: httpsAgent,
        });
    
        return client({
            method: "get",
            url: outgoingURL,
            timeout: timeout,
            headers: {
                'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            }
        })
    } else {
        return axios({
            method: "get",
            url: outgoingURL,
            timeout: timeout,
            headers: {
                'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            }
        })
    }
}

function getIP(proxyURL, timeout){
    return doRequest(proxyURL, "https://api64.ipify.org", timeout);
}

function getGeo(proxyURL, timeout){
    return doRequest(proxyURL, "https://lumtest.com/myip.json", timeout);
}

function getScore(proxyIP, timeout){
    return doRequest(`direct://`, `https://talosintelligence.com/cloud_intel/ip_reputation?ip=${proxyIP}`, timeout);
    //return doRequest(`direct://`, `https://talosintelligence.com/reputation_center/lookup?search=${proxyIP}`, timeout);
}


class testInstance {
    #proxy_url
    #timeout = 30000

    constructor(proxy_url, timeout) {
        this.#proxy_url = this.formatProxyURL(proxy_url);
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

    formatProxyURL(url) {
        let isGoodProxy = this.testProxyURL(url)
        let finalURL = `${isGoodProxy.protocol}://`

        if (isGoodProxy.username) {
            finalURL = `${finalURL}${isGoodProxy.username}:${isGoodProxy.password}@${isGoodProxy.proxy_url}:${isGoodProxy.proxy_port}`
        } else {
            finalURL = `${finalURL}${isGoodProxy.proxy_url}:${isGoodProxy.proxy_port}`
        }

        return finalURL;
    }

    fastTest(url) {
        return new Promise((resolve, reject) => {
            let start = Date.now()



            doRequest(this.#proxy_url, url, this.#timeout).then((result) => {
                resolve({
                    status: result.status,
                    data: result.data,
                    headers: result.headers,
                    latency: Date.now() - start,                
                })
            }).catch((error) => {
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

    test(url, browser) {
        return new Promise((resolve, reject) => {
            this.fastTest(url).then(async () => {
                let page = await browser.newPage()
                let start = Date.now()

                page.setDefaultNavigationTimeout(this.#timeout);
                page.setDefaultTimeout(this.#timeout);

                await page.setRequestInterception(true);
                page.on('request', async request => {
                    await useProxy(request, this.#proxy_url);
                });

                page.goto(url, { waitUntil: "networkidle" }).then(async (e) => {
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
        })
    }

    #getIP(proxy){
        return new Promise((resolve, reject) => {
            getIP(proxy, this.#timeout).then((ip) => {
                resolve(ip.data);
            }).catch(reject);
        })
    }

    getLocalIP(){
        return this.#getIP("direct://");
    }

    getProxyIP(){
        return this.#getIP(this.#proxy_url);
    }

    getRawProxyScore(){
        return new Promise((resolve, reject) => {
            this.getProxyIP().then((proxyIP) => {
                getScore(proxyIP, this.#timeout).then((result) => {
                    result = result.data.reputation;
                    result = {
                        reputation_x10: result.reputation_x10,
                        threat_level_id: result.threat_level_id,
                        spam_prob_x10000: result.spam_prob_x10000,
                        spam_level: result.spam_level,
                        threat_level_mnemonic: result.threat_level_mnemonic,
                        rep_rule_mnemonics: result.rep_rule_mnemonics,
                    };

                    resolve(result);
                }).catch((error) => {
                    if (error.message.includes("time"))
                        return reject("timeout")
    
                    reject({
                        message: error.message,
                        status: error.response?.status,
                        data: error.response?.data,
                        headers: error.response?.headers,
                    })            
                })
            }).catch((error) => {
                if (error.message.includes("time"))
                    return reject("timeout")

                reject({
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers,
                })   
            })
        })
    }

    getProxyScore(){
        return new Promise((resolve, reject) => {
            this.getRawProxyScore().then((rawProxyScore) => {
                console.log(rawProxyScore)
                resolve(
                    rawProxyScore.reputation_x10 >= 0 &&
                    //rawProxyScore.spam_prob_x10000 <= 100 &&
                    rawProxyScore.spam_level == "None"
                );
            }).catch(reject)
        })
    }

    testPrivacy(originalIP) {
        return new Promise((resolve, reject) => {
            let start = Date.now()
            
            if(originalIP){
                Promise.all([getIP(this.#proxy_url, this.#timeout), getGeo(this.#proxy_url, this.#timeout)]).then(([ip, geo]) => {
                    let directIP = originalIP; 
                    ip = ip.data; geo = geo.data;
    
                    resolve({
                        privacy: directIP !== ip ? "elite" : "transparent",
                        ip: ip,
                        location: geo,
                    })
                }).catch((error) => {
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
            } else {
                Promise.all([getIP("direct://", this.#timeout), getIP(this.#proxy_url, this.#timeout), getGeo(this.#proxy_url, this.#timeout)]).then(([directIP, ip, geo]) => {
                    directIP = directIP.data; ip = ip.data; geo = geo.data;
    
                    resolve({
                        privacy: directIP !== ip ? "elite" : "transparent",
                        ip: ip,
                        location: geo,
                    })
                }).catch((error) => {
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
            }
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