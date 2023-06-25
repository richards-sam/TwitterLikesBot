-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL,
    "tweetBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "entities" JSONB NOT NULL,
    "quoted" TEXT,
    "fullText" TEXT NOT NULL,
    "replyTo" TEXT,
    "lang" TEXT NOT NULL,
    "quoteCount" INTEGER NOT NULL,
    "replyCount" INTEGER NOT NULL,
    "retweetCount" INTEGER NOT NULL,
    "likeCount" INTEGER NOT NULL,
    "reactCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tweet_pkey" PRIMARY KEY ("id")
);
