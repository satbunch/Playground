// ドット記法
function isAdultDot(user: { name: String; age: number }): boolean {
  return user.age >= 20;
}

// 分割代入
function isAdultDestructuring(user: { name: String; age: number }): boolean {
  const { age } = user;
  return age >= 20;
}

const isAdultDestructuringArrow = (user: {
  name: string;
  age: number;
}): boolean => {
  const { age } = user;
  return age >= 20;
};

// オプショナルチェーン
function isAdultOptional(user: { name: String; age?: number }): boolean {
  return (user?.age ?? 0) >= 20;
}

// in演算子で存在確認
const isAdultIn = (user: { name: String; age: number }): boolean => {
  if ('age' in user) {
    return user.age >= 20;
  }
  return false;
};

const user = { name: 'Alice', age: 25 };

console.log(isAdultDot(user));
console.log(isAdultDestructuring(user));
console.log(isAdultDestructuringArrow(user));
console.log(isAdultOptional(user));
console.log(isAdultIn(user));
