const http = require('http');
const path = require('path');
const express = require('express');
const socketIo = require('socket.io');
const needle = require('needle');
const config = require('dotenv').config();
const TOKEN = process.env.TWITTER_BEARER_TOKEN;

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'))
});

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';

const rules = [{ value: 'coding' }];

//Get stream rules
const getRules = async () => {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    });
    return response.body;
};

//Set stream rules
const setRules = async () => {
    const data = {
        add: rules,
    }
    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
        },
    });
    return response.body;
};

//Delete stream rules
const deleteRules = async (rules) => {
    if (!Array.isArray(rules.data)) {
        return null;
    }

    const ids = rules.data.map((rule) => rule.id);

    const data = {
        delete: {
            ids: ids,
        },
    }
    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
        },
    });
    return response.body;
};

const streamTweets = (socket) => {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    })

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data);
            socket.emit('tweet', json);
        } catch (err) { }
    })
}

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

io.on('connection', async () => {
    console.log('Client connected');
    let currentRules;
    try {
        //Get rules
        currentRules = await getRules();

        //Delete all rules
        await deleteRules(currentRules);

        //Set rules from array above
        await setRules();

    } catch (err) {

        console.error(err);
        process.exit(1);

    }
    streamTweets(io);
})

