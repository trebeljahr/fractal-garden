const rules = {
  A: "AB",
  B: "A",
};

const axiom = "A";
let sentence = axiom;

function generateNextSentence() {
  let newSentence = "";
  for (let char of sentence) {
    newSentence += rules[char] || char;
  }
  sentence = newSentence;
}

function setup() {
  const btn = createButton("Click");
  btn.mousePressed(() => {
    console.log("Hello");
    generateNextSentence();
    createP(sentence);
  });
}
