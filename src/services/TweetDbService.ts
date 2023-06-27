import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function saveTweet(like, botPostTime: Date, discordMsgId: string) {
    return await prisma.tweet.create({
        data: {
            id: like.id,
            tweetBy: like.tweetBy,
            createdAt: new Date(like.createdAt),
            entities: like.entities,
            quoted: like.quoted,
            fullText: like.fullText,
            replyTo: like.replyTo,
            lang: like.lang,
            quoteCount: like.quoteCount,
            replyCount: like.replyCount,
            retweetCount: like.retweetCount,
            likeCount: like.likeCount,
            reactCount: 0,
            discordMsgId, 
            botPostTime,
        }
    });
}

export async function incrementReactCount(tweetId: string) {
    const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
    });

    if (tweet) {
        return await prisma.tweet.update({
            where: { id: tweetId },
            data: {
                reactCount: {
                    increment: 1
                },
            },
        });
    } else {
        console.error('Tweet not found:', tweetId);
    }
}

export async function updateReactCount(tweetId: string, newCount: number) {
    const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
    });

    if (tweet) {
        return await prisma.tweet.update({
            where: { id: tweetId },
            data: {
                reactCount: newCount,
            },
        });
    } else {
        console.error('Tweet not found:', tweetId);
    }
}

export async function findTweetById(tweetId: string) {
    return await prisma.tweet.findUnique({
        where: { id: tweetId },
    });
}