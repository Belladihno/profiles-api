export interface ValidationResponse {
  message: string | string[];
}

export interface SeedProfile {
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
}

export interface SeedResponse {
  profiles: SeedProfile[];
}

export interface GitHubProfile {
  id: string;
  username: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}
