const a = new Date();
console.log(a.toLocaleDateString());
const b = new Date(a.getFullYear(), a.getMonth()+1, 0);
console.log(b.toLocaleDateString());

const d = undefined - new Date();
console.log(d < 1);