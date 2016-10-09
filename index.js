const
    bitcoinFiatPrice = require('bitcoin-fiat-price'),
    currencyFormatter = require('currency-formatter'),
    https = require('https'),
    Q = require('q'),
    _ = require('lodash'),
    urls = {
        total: {
            hostname: 'zcoin.rocks',
            path: '/chain/ZCoin/q/totalbc'
        },
        novaexchange: {
            hostname: 'novaexchange.com',
            path: '/remote/v2/market/orderhistory/BTC_XZC/'
        }
    },
    currency = 'USD',
    market = 'BTC_XZC',
    timeout = 30 * 1000; // in milliseconds

const request = (opts) => {
    const
        deferred = Q.defer(),
        request = https.get({
            hostname: opts.hostname,
            path: opts.path
        }, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                deferred.resolve(JSON.parse(body));
            });

            res.on('error', () => {
                deferred.reject();
            });
        });

    request.on('error', () => {
        deferred.reject();
    });

    request.end();

    return deferred.promise;
};

const btcPrice = () => {
    const deferred = Q.defer();

    bitcoinFiatPrice.getCurrentPrice(currency).then(function(price) {
        deferred.resolve(parseFloat(price).toFixed(3));
    });

    return deferred.promise;
};

const formatCurrency = (amount) => {
    return currencyFormatter.format(amount, { code: currency });
};

const loop = () => {
    request(urls.total)
        .then(zcoinData => {
            let totalCoins = parseInt(zcoinData, 10);

            btcPrice()
                .then(btcPrice => {
                    request(urls.novaexchange)
                        .then(novaData => {
                            let lastPrice = parseFloat(novaData.items[0].price),
                                totalBTC = parseFloat(totalCoins * lastPrice).toFixed(8),
                                totalCurrency = formatCurrency(btcPrice * totalBTC);

                            console.log(`"${market}" market cap is now ${totalBTC} BTC / ${totalCurrency}`);
                        })
                        .fail(message => {
                            console.error(message);
                        });
                })
                .fail(message => {
                    console.error(message);
                });

        })
        .fail(message => {
            console.error(message);
        });
};

loop();

setInterval(loop, timeout);
