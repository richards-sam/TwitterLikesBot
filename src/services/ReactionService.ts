import { MessageReaction, User } from 'discord.js';
import { incrementReactCount, updateReactCount } from './TweetDbService';

// ReactionService.ts
export async function handleReactionAdd(reaction: MessageReaction, user: User) {
    //console.log('by user:', user.id);
    if (user.bot) return; // Ignore reactions from bots
    if (reaction.message.author.id !== process.env.DISCORD_BOT_ID) return;
    if (reaction.emoji.name === 'catwithtearsofjoyfacebook' || reaction.emoji.name === '😹') {
        const urlRegex = /https:\/\/vxtwitter\.com\/[^\/]+\/status\/(\d+)/;
        const match = reaction.message.content.match(urlRegex);
        //console.log('match:', match);
        if (match) {
            const tweetId = match[1];
            try {
                await updateReactCount(tweetId, reaction.count);
                console.log('React count updated for tweet:', tweetId, 'by user:', user.id);
            } catch (error) {
                console.error('Failed to update react count:', error);
            }
        }
    }
}

