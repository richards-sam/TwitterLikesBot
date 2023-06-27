import { findTweetById } from './TweetDbService';

export async function goreCheck(message) {
    // Ignore reply messages
    if (message.reference) {
        return;
    }
    
    // Extract the tweet ID from the message content
    const tweetId = message.content.match(/\/status\/(\d+)$/)?.[1];
    if (!tweetId) {
        return;
    }

    // Check if the tweet is already posted
    const tweet = await findTweetById(tweetId);
    if (tweet) {
        // If the tweet is found, reply to the message
        const oldMessageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${tweet.discordMsgId}`
        await message.reply(`Gore\n ${oldMessageLink}`);
    }
}