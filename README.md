<p align="center">
    <img alt="ViewCount" src="https://views.whatilearened.today/views/github/JijaProGamer/fast-proxy-checker.svg">
    <img alt="OS" src="https://img.shields.io/badge/OS-Windows%20/%20Linux/%20MacOS-success">
</p>

# Fast proxy tester

NodeJS module for verifying the speed, quality, transparency and functionality of a proxy.

Socks4/Socks5/Http/Https proxy support

Can check transparency (Elite/Transparent), location, end IP address, etc.

Example of supported proxies:

socks5://user:password@ip:port
socks4://ip:port:user:password
http://ip:port
https://ip:port

All protocols support user and password authorization
except socks4, which only supports user authorization

## Setting it up

```js
import createProxyTester from "fast-proxy-tester" // ESM
const createProxyTester = require("fast-proxy-tester").createProxyTester // CJS 

// The first argument is the URL of the proxy
// The second argument is the timeout in milliseconds

let tester = createProxyTester("http://proxy:port", 30000)
```

## functions:

    * testPrivacy()

tells you if the proxy is transparent or not, and its location and ip.

```js
    await tester.testPrivacy().then((privacy) => {
        console.log(privacy.privacy) // transparent or elite
        console.log(privacy.ip) // the IP of the proxy
        console.log(privacy.geo) 

        // {city, region, region_name, postal_code, latitude, longitude, tz}
    }).catch((error) => {
        console.log(err) // The error is the same as a standard fastTest error
    })
```

    * testProxyURL(proxy_url)
        proxy_url - url of the proxy


Checks if the proxy is formatted correctly
If it is then it isValid is true and it parses the proxy
If not then isValid is false and err is set to the error

```js
    let isValidProxy = tester.testProxyURL(proxy_url)
    if(isValidProxy.isValid){ // If the proxy is valid it parses the proxy
        console.log(isValidProxy.protocol)
        console.log(isValidProxy.proxy_url)
        console.log(isValidProxy.proxy_port)

        if(isValidProxy.username){
            console.log(isValidProxy.username)
            console.log(isValidProxy.password)
        }
    } else {
        console.log(isValidProxy.err)
    }
    console.log(privacy.privacy) // transparent or elite
    console.log(privacy.ip) // the IP of the proxy
    console.log(privacy.geo) 

    // {city, region, region_name, postal_code, latitude, longitude, tz}
```

    * fastTest(url)
        url - the url of the page to test

Note: If the proxy format is invalid it will reject with a testProxyURL() error

Makes a quick request using axios and lets you check 
the headers, the status, the data and the latency.

```js
    await tester.fastTest(url).then((result) => {
        console.log(result.status) // status code (200-226 or it errors)
        console.log(result.headers) // Headers of the webpage retrived
        console.log(result.latency) // Latency of the proxy in milliseconds
        console.log(result.data) // The raw document result of the request 
    }).catch((error) => {
        if(error == "timeout"){
            console.log("Proxy speed too small")
        } else {
            console.log(result.status) // Not always present
            console.log(result.headers) // Not always present
            console.log(result.latency) 
            console.log(result.data) // Not always present
        }
    })
```

 * test(url, browser)
        url - the url of the page to test
        browser - a browser launched by puppeteer

Note: If the proxy format is invalid it will reject with a testProxyURL() error

Makes a quick request using axios and lets you check 
the headers, the status, the data and the latency.

```js
    await tester.test(url, chromePath, puppeteer).then((result) => {
        console.log(result.status) // status code (200-226 or it errors)
        console.log(result.headers) // Headers of the webpage retrived
        console.log(result.latency) // Latency of the proxy in milliseconds
        console.log(result.data) // The raw document result of the request 
    }).catch((error) => {
        // Error deployed by puppeteer

        console.log(error)
    })
```