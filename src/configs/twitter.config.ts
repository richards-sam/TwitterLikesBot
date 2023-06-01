import { Rettiwt, AccountService, UserService } from 'rettiwt-api';

export default async function(): Promise<UserService> {
  const accountService = new AccountService();
  const { kdt, twid, ct0, auth_token } = await accountService.login(
    process.env.TWITTER_EMAIL,
    process.env.TWITTER_USERNAME,
    process.env.TWITTER_PASSWORD
  );

  const rettiwt = Rettiwt({
    auth_token,
    ct0,
    kdt,
    twid,
  });
  return rettiwt.users;
};
