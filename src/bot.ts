import { Client, GatewayIntentBits, MessageReaction, Partials, TextChannel, User } from 'discord.js';
import { Rettiwt, UserService, Tweet, CursoredData, Cursor } from 'rettiwt-api';
import getUserService from './configs/twitter.config';
import dotenv from 'dotenv'
import TwitterLikesService from './services/TwitterLikesService';
import { saveTweet } from './services/TweetDbService';
import { handleReactionAdd } from './services/ReactionService';
import { goreCheck } from './services/GoreCheckService';

dotenv.config();

const requiredEnvVars = ['TWITTER_EMAIL', 'TWITTER_USERNAME', 'TWITTER_PASSWORD', 'MEOWIC_TWITTER_ID', 'DISCORD_CHANNEL_ID'];
requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
        console.error(`Please define ${varName} environment variable.`);
        process.exit(1);
    }
});

const twitterEmail = process.env.TWITTER_EMAIL;
const twitterUsername = process.env.TWITTER_USERNAME;
const twitterPassword = process.env.TWITTER_PASSWORD;
const meowicTwitterId = process.env.MEOWIC_TWITTER_ID;
let discordChannelId = process.env.DISCORD_CHANNEL_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})

const userServicePromise = getUserService();

client.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {
    console.log('Reaction added:', reaction.emoji.name);
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }
    handleReactionAdd(reaction, user);
});

let wasSleeping = false;

function isSleepTime() {
    const options = {
        timeZone: 'Pacific/Auckland',
        hour12: false,
        hour: 'numeric' as const,
        minute: 'numeric' as const,
        second: 'numeric' as const
    };

    const currentHour = parseInt(new Date().toLocaleString('en-US', options), 10);
    return currentHour <= 11 && currentHour >= 4;
}

async function sendDiscordMessage(content) {
    try {
        const channel = await client.channels.fetch(discordChannelId) as TextChannel;
        if (!channel) {
            console.error(`Channel with ID ${discordChannelId} not found`);
            return;
        }
        await channel.send(content);
    } catch(err) {
        console.error(`Failed to send message to channel: ${err}`);
    }
}

async function fetchNewLikes(userService, twitterLikesService) {
    console.log('Fetching new likes...');
    const newLikesCursoredData = await twitterLikesService.getNewLikes(meowicTwitterId);
    let newLikes = newLikesCursoredData.list;
    
    if (newLikes.length > 20) {
        newLikes = newLikes.slice(0, 20);
    }
    // reverse the array for chronological order
    newLikes = newLikes.reverse();
    return newLikes;
}

async function sendLikeNotifications(userService, newLikes) {
    for (const like of newLikes) {
        try {
            const channel = await client.channels.fetch(discordChannelId) as TextChannel;
            if (!channel) {
                console.error(`Channel with ID ${discordChannelId} not found`);
                continue;
            }
            const user = await userService.getUserDetails(like.tweetBy);
            const likeUrl = `https://vxtwitter.com/${user.userName}/status/${like.id}`
            const messageContent = `Meowic liked this\n${likeUrl}`;
            console.log('Sending message:', messageContent);
            const sentMsg = await channel.send(messageContent);
            try {
                const botPostTime = new Date();
                await saveTweet(like, botPostTime, sentMsg.id);
            } catch(err) {
                console.error(`Failed to store tweet in DB: ${err.message}`);
            }
        } catch(err) {
            console.error(`Failed to send message to channel: ${err}`);
        }
    }
}

async function checkAndNotifyChanges(userService, twitterLikesService) {
    if (isSleepTime()) {
        console.log('Sleep time...');
        if (!wasSleeping) {
            await sendDiscordMessage('gn');
            wasSleeping = true;
        }
        return;
    }
    if (wasSleeping) {
        await sendDiscordMessage('gm');
        wasSleeping = false;
    }
    console.log('Checking for changes...');
    const newLikes = await fetchNewLikes(userService, twitterLikesService);
    await sendLikeNotifications(userService, newLikes);
    console.log('Finished checking for changes.');
}

async function init() {
    console.log('Initializing...')
    client.once('ready', async () => { 
        console.log('Ready!');
        
        const userService = await userServicePromise;
        console.log('userServicePromise resolved')
        const twitterLikesService = new TwitterLikesService(userService);
        
        setInterval(() => checkAndNotifyChanges(userService, twitterLikesService), (60 + Math.random() * 90) * 60 * 1000);

        setInterval(() => {
            const options = {
                timeZone: 'Pacific/Auckland',
                hour12: false,
                hour: 'numeric' as const,
                minute: 'numeric' as const,
                second: 'numeric' as const
            };
        
            const currentTime = new Date().toLocaleString('en-US', options);
            console.log(currentTime);
            console.log('Sleep time:', isSleepTime());
        }, 1000 * 60 * 5);
    });
}

(async () => {
    console.log(`Login attempt...`);
    try {
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('Error logging in:', error);
        console.error(`Failed to log in.`);
        process.exit(1);
    }
})();

(async () => {
    await init();
})();

client.on('debug', (info) => {
    console.log('Debug:', info);
});

client.on('warn', (info) => {
    console.log('Warn:', info);
});

client.on('error', (error) => {
    console.error('Error:', error);
});

client.on('messageCreate', async message => {
    if (message.author.bot) {
        return;
    }

    await goreCheck(message);
    const randomNumber = Math.floor(Math.random() * 500);
    if (randomNumber === 0) {
        try {
            await message.react('🤓');
            console.log('Nerd reacted to user:', message.author.id);
        } catch (error) {
            console.error('Failed to react to message:', error);
        }
    }
});
