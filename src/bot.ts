import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { Rettiwt, UserService, Tweet, CursoredData, Cursor } from 'rettiwt-api';
import getUserService from './configs/twitter.config';
import dotenv from 'dotenv'
import TwitterLikesService from './services/TwitterLikesService'; // Update this to the path of your TwitterLikesService

dotenv.config();

const twitterEmail = process.env.TWITTER_EMAIL;
const twitterUsername = process.env.TWITTER_USERNAME;
const twitterPassword = process.env.TWITTER_PASSWORD;

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


// Function to check for changes in likes and send a Discord notification
async function checkAndNotifyChanges() {
    const userService: UserService = await userServicePromise;
    const twitterLikesService = new TwitterLikesService(userService);
    const newLikesCursoredData = await twitterLikesService.getNewLikes('2433632562');
    const newLikes = newLikesCursoredData.list;
    newLikes.forEach(async (like: Tweet) => {
        // Send Discord notification
        const channel = await client.channels.fetch('1113392078408388713') as TextChannel; 
        const user = userService.getUserDetails(like.tweetBy)
        const likeUrl = `https://twitter.com/${(await user).userName}/status/${like.id}`
        console.log(likeUrl)
        channel.send(`New like: ${likeUrl}`);
    });
}

// Run once immediately on first load
checkAndNotifyChanges();

// Set an interval to periodically check for new likes
setInterval(checkAndNotifyChanges, (5 + Math.random() * 5) * 60 * 1000); // Random time between 5 and 10 minutes
