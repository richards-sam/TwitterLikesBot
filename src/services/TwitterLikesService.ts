import { CursoredData, UserService, Tweet, Cursor } from 'rettiwt-api';

export default class TwitterLikesService {
  private lastLikes: Tweet[] = [];
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public async getNewLikes(userId: string): Promise<CursoredData<Tweet>> {
    const userLikesCursoredData = await this.userService.getUserLikes(userId);
    const userLikes = userLikesCursoredData.list;
    const newLikes = userLikes.filter(like => !this.lastLikes.some(existingLike => existingLike.id === like.id));
    
    this.lastLikes = userLikes;

    return new CursoredData(newLikes, userLikesCursoredData.next.value);
  }
}
