import { Client, GatewayIntentBits, MessageReaction, Partials, TextChannel, User } from 'discord.js';
import { Rettiwt, UserService, Tweet, CursoredData, Cursor } from 'rettiwt-api';
import getUserService from './configs/twitter.config';
import dotenv from 'dotenv'
import TwitterLikesService from './services/TwitterLikesService';
import { saveTweet } from './services/TweetDbService';
import { handleReactionAdd } from './services/ReactionService';

dotenv.config();

const twitterEmail = process.env.TWITTER_EMAIL;
const twitterUsername = process.env.TWITTER_USERNAME;
const twitterPassword = process.env.TWITTER_PASSWORD;
const meowicTwitterId = process.env.MEOWIC_TWITTER_ID;
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
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
})


const userServicePromise = getUserService();

client.on('messageReactionAdd', async (reaction: MessageReaction, user: User) => {
    // When a reaction is received, check if the structure is partial
    console.log('Reaction added:', reaction.emoji.name);
    if (reaction.partial) {
        // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }

    handleReactionAdd(reaction, user);
});

async function checkAndNotifyChanges(userService, twitterLikesService) {
    console.log('Checking for changes...');
    const newLikesCursoredData = await twitterLikesService.getNewLikes(meowicTwitterId);
    let newLikes = newLikesCursoredData.list;

    if (newLikes.length > 10) {
        newLikes = newLikes.slice(0, 10);
    }
    // reverse the array for chronological order
    newLikes = newLikes.reverse();
    for (const like of newLikes) {
        // Send Discord notification
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
    console.log('Finished checking for changes.');
}

async function init() {
    console.log('Initializing...')
    client.once('ready', async () => { 
        console.log('Ready!');
        
        const userService = await userServicePromise;
        console.log('userServicePromise resolved')
        const twitterLikesService = new TwitterLikesService(userService);
        
        // Run once immediately on first load
        //checkAndNotifyChanges(userService, twitterLikesService);
        
        // Set an interval to periodically check for new likes
        setInterval(() => checkAndNotifyChanges(userService, twitterLikesService), (15 + Math.random() * 25) * 60 * 1000);
    });
}

// Attempt to log in
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

//start main cycle
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
    // Ignore messages from bots
    if (message.author.bot) {
        return;
    }

    // Randomly react to any message
    const randomNumber = Math.floor(Math.random() * 500);
    if (randomNumber === 0) {
        try {
            await message.react('🤓');
        } catch (error) {
            console.error('Failed to react to message:', error);
        }
    }
});