import { CursoredData, UserService, Tweet, Cursor } from 'rettiwt-api';
import { findTweetById } from './TweetDbService';

export default class TwitterLikesService {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public async getNewLikes(userId: string): Promise<CursoredData<Tweet>> {
    const userLikesCursoredData = await this.userService.getUserLikes(userId);
    const userLikes = userLikesCursoredData.list;

    const newLikes = [];

    for (let like of userLikes) {
        const existingTweet = await findTweetById(like.id);

        if (!existingTweet) {
            newLikes.push(like);
        }
    }

    return new CursoredData(newLikes, userLikesCursoredData.next.value);
  }
}
