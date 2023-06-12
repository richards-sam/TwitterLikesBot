import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { Rettiwt, UserService, Tweet, CursoredData, Cursor } from 'rettiwt-api';
import getUserService from './configs/twitter.config';
import dotenv from 'dotenv'
import TwitterLikesService from './services/TwitterLikesService';

dotenv.config();

const twitterEmail = process.env.TWITTER_EMAIL;
const twitterUsername = process.env.TWITTER_USERNAME;
const twitterPassword = process.env.TWITTER_PASSWORD;

const meowicTwitterId = process.env.MEOWIC_TWITTER_ID;

const omarDiscordId = process.env.OMAR_DISCORD_ID;

let discordChannelId = process.env.DISCORD_CHANNEL_ID;

if (!twitterEmail || !twitterUsername || !twitterPassword) {
    console.error('Please define TWITTER_EMAIL, TWITTER_USERNAME, and TWITTER_PASSWORD environment variables.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
})

const maxRetries = 5;

async function withRetry(fn, args = [], retries = 0) {
    try {
        return await fn(...args);
    } catch (error) {
        if (retries >= maxRetries) {
            console.error('Maximum retries exceeded');
            throw error;
        }
        console.error('Failed with error, retrying...', error);
        // Wait for 2^retries * 1000 ms (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 40000));
        return withRetry(fn, args, retries + 1);
    }
}

// Create an instance of the TwitterLikesService which is a promise
const userServicePromise = withRetry(getUserService);

async function checkAndNotifyChanges(userService, twitterLikesService) {
    console.log('Checking for changes...');
    const newLikesCursoredData = await withRetry(twitterLikesService.getNewLikes.bind(twitterLikesService), [meowicTwitterId]);
    let newLikes = newLikesCursoredData.list;

    if (newLikes.length > 10) {
        newLikes = newLikes.slice(0, 10);
    }
    // reverse the array for chronological order
    newLikes = newLikes.reverse();
    for (const like of newLikes) {
        // Send Discord notification
        try {
            const channel = await withRetry(client.channels.fetch.bind(client.channels), [discordChannelId]) as TextChannel;
            if (!channel) {
                console.error(`Channel with ID ${discordChannelId} not found`);
                continue;
            }
            const user = await withRetry(userService.getUserDetails.bind(userService), [like.tweetBy]);
            //const likeUrl = `https://twitter.com/${user.userName}/status/${like.id}`
            const likeUrl = `https://vxtwitter.com/${user.userName}/status/${like.id}`
            const messageContent = `Meowic liked this\n${likeUrl}`;
            console.log('Sending message:', messageContent);
            withRetry(channel.send.bind(channel), [messageContent]);
        } catch(err) {
            console.error(`Failed to send message to channel: ${err}`);
        }
    }
    console.log('Finished checking for changes.');
}

async function init() {
    console.log('Initializing...')
    client.once('ready', async () => { 
        console.log('Ready!');
        
        const userService = await userServicePromise;
        userServicePromise.catch((error) => {
            console.error('Error in userServicePromise:', error);
        });
        console.log('userServicePromise resolved')
        const twitterLikesService = new TwitterLikesService(userService);
        
        // Run once immediately on first load
        //checkAndNotifyChanges(userService, twitterLikesService);
        
        // Set an interval to periodically check for new likes
        setInterval(() => withRetry(checkAndNotifyChanges.bind(null, userService, twitterLikesService)), (15 + Math.random() * 25) * 60 * 1000);
    });
}

//const maxRetries = 5;
let attempt = 0;

async function attemptLogin() {
    try {
        console.log(`Login attempt ${attempt + 1}...`);
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('Error logging in:', error);
        attempt++;
        if (attempt < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
            await attemptLogin();
        } else {
            console.error(`Failed to log in after ${maxRetries} attempts.`);
            process.exit(1);
        }
    }
}

//start main cycle
(async () => {
    await init();
})();

// Attempt to log in
attemptLogin();

client.on('debug', (info) => {
    console.log('Debug:', info);
});

client.on('warn', (info) => {
    console.log('Warn:', info);
});

client.on('error', (error) => {
    console.error('Error:', error);
});

const userIdToWatch = omarDiscordId;

client.on('messageCreate', async message => {
    // React if the message was sent by the user we're watching
    if (message.author.id === userIdToWatch) {
        try {
            await message.react('🤓');
        } catch (error) {
            console.error('Failed to react to message:', error);
        }
    }
});
