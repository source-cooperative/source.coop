import { Text, Box } from "theme-ui";

const quotes = [
  {
    text: "Relationships, Body, Mind.",
    author: "Jed Sundwall",
  },
  {
    text: "Deep in the human unconscious is a pervasive need for a logical universe that makes sense. But the real universe is always one step beyond logic.",
    author: "Frank Herbert (Dune)",
  },
  {
    text: "If you can't explain it to a six year old, you don't understand it yourself.",
    author: "Albert Einstein",
  },
];

export function randomQuote() {
  var seed = Math.floor(Date.now() / 10000);
  var x = Math.sin(seed++) * 10000;
  var i = x - Math.floor(x);
  return quotes[Math.floor(i * quotes.length)];
}

export function Quote() {
  const quote = randomQuote();
  return (
    <Box sx={{ backgroundColor: "teal", p: 3 }}>
      <Text sx={{ textAlign: "center", display: "block" }}>{quote.text}</Text>
      <Text
        sx={{
          textAlign: "center",
          fontSize: 2,
          display: "block",
        }}
      >
        — {quote.author}
      </Text>
    </Box>
  );
}
