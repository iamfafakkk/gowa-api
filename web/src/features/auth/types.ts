export type ConsoleUser = {
  id: number;
  username: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: ConsoleUser;
};

export type CreateUserInput = {
  username: string;
  password: string;
  role?: string;
};

export type UpdatePasswordInput = {
  password: string;
};
