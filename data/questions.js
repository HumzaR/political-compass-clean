const questions = [
  {
    id: 1,
    text: "The government should regulate the economy to protect the public interest.",
    type: "scale", // or "yesno"
    axis: "economic", // economic or social
    weight: 2,
    direction: -1 // -1 = left/libertarian, +1 = right/authoritarian
  },
  {
    id: 2,
    text: "A strong leader is more important than democratic debate.",
    type: "scale",
    axis: "social",
    weight: 3,
    direction: 1
  },
  {
    id: 3,
    text: "Same-sex couples should have the same rights as heterosexual couples.",
    type: "yesno",
    axis: "social",
    weight: 3,
    direction: -1
  }
];

export default questions;
