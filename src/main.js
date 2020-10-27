const Apify = require('apify');
const Config = require('./Config');
const Service = require('./Service');

Apify.main(async () => {
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input, { depth: 8 });


    const config = new Config(input);

    const service = new Service(config);
    await service.init();

    if (!config.isSetupMode) {
        await service.execute();
    }
    console.log('Actor finished');
});
