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


// Create an instance of the TwitterLikesService which is a promise
const userServicePromise = getUserService();

async function checkAndNotifyChanges(userService, twitterLikesService) {
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
            //const likeUrl = `https://twitter.com/${user.userName}/status/${like.id}`
            const likeUrl = `https://vxtwitter.com/${user.userName}/status/${like.id}`
            const messageContent = `Meowic liked this\n${likeUrl}`;
            channel.send(messageContent);
        } catch(err) {
            console.error(`Failed to send message to channel: ${err}`);
        }
    }
}

async function init() {
    const userService = await userServicePromise;
    userServicePromise.catch((error) => {
        console.error('Error in userServicePromise:', error);
    });
    const twitterLikesService = new TwitterLikesService(userService);
    client.once('ready', () => {
        console.log('Ready!');
        
        // Run once immediately on first load
        //checkAndNotifyChanges(userService, twitterLikesService);
        
        // Set an interval to periodically check for new likes
        setInterval(() => checkAndNotifyChanges(userService, twitterLikesService), (15 + Math.random() * 25) * 60 * 1000);
    });
    
}

//start main cycle
(async () => {
    await init();
})();

client.login(process.env.DISCORD_TOKEN);