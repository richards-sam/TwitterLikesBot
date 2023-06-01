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
const discordChannelId = process.env.DISCORD_CHANNEL_ID;

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

client.once('ready', () => {
    console.log('Ready!');
});

client.login(process.env.DISCORD_TOKEN);

client.on("messageCreate", async (message) => {
    console.log(message.content)
});

// Create an instance of the TwitterLikesService which is a promise
const userServicePromise = getUserService();

async function init() {
    const userService = await userServicePromise;
    const twitterLikesService = new TwitterLikesService(userService);

    // Function to check for changes in likes and send a Discord notification
    async function checkAndNotifyChanges() {
        const newLikesCursoredData = await twitterLikesService.getNewLikes(meowicTwitterId);
        let newLikes = newLikesCursoredData.list;

        if (newLikes.length > 5) {
            newLikes = newLikes.slice(0, 5);
        }
        // reverse the array for chronological order
        newLikes = newLikes.reverse();
        for (const like of newLikes) {
            // Send Discord notification
            const channel = await client.channels.fetch(discordChannelId) as TextChannel; 
            const user = await userService.getUserDetails(like.tweetBy);
            const likeUrl = `https://twitter.com/${user.userName}/status/${like.id}`
            const messageContent = `New Meowic like!\n\n${likeUrl}`;
            channel.send(messageContent);
        }
    }

    // Run once immediately on first load
    checkAndNotifyChanges();

    // Set an interval to periodically check for new likes
    setInterval(checkAndNotifyChanges, (10 + Math.random() * 15) * 60 * 1000); // Random time between 5 and 10 minutes
}

//start main cycle
init();