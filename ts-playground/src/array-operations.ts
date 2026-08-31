// --- 配列操作: 偶数を取り出して2倍にする ---
// for文
const doubleEvenFor = (numbers: number[]): number[] => {
  const result: number[] = [];
  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    if (num !== undefined && num % 2 === 0) {
      result.push(num * 2);
    }
  }
  return result;
};

// for...of
function doubleEvenForOf(numbers: number[]): number[] {
  const result: number[] = [];
  for (const num of numbers) {
    if (num % 2 === 0) {
      result.push(num * 2);
    }
  }
  return result;
}

// forEach
const doubleEvenForEach = (numbers: number[]): number[] => {
  const result: number[] = [];
  numbers.forEach((num) => {
    if (num % 2 === 0) {
      result.push(num * 2);
    }
  });
  return result;
};

// filter + map
function doubleEvenFilterMap(numbers: number[]): number[] {
  // const evenArray = numbers.filter((num) => num % 2 === 0);
  // return evenArray.map((x) => x * 2);
  // ↓refactoring
  return numbers.filter((num) => num % 2 === 0).map((num) => num * 2);
}

// reduce
const doubleEvenReduce = (numbers: number[]): number[] => {
  return numbers.reduce<number[]>((acc, curr) => {
    if (curr % 2 === 0) {
      acc.push(curr * 2);
    }
    return acc;
  }, []);
};

// 実行例
const numbers = [1, 2, 3, 4, 5];

console.log(doubleEvenFor(numbers)); // [4, 8]
console.log(doubleEvenForOf(numbers)); // [4, 8]
console.log(doubleEvenForEach(numbers)); // [4, 8]
console.log(doubleEvenFilterMap(numbers)); // [4, 8]
console.log(doubleEvenReduce(numbers)); // [4, 8]
