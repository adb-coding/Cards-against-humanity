export class CardDeck {
  constructor(cards) {
    this.original = [...cards];
    this.pile = [];
    this.shuffle();
  }

  shuffle() {
    this.pile = [...this.original];
    for (let i = this.pile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pile[i], this.pile[j]] = [this.pile[j], this.pile[i]];
    }
  }

  draw() {
    if (this.pile.length === 0) this.shuffle();
    return this.pile.pop();
  }

  drawMany(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.draw());
    }
    return cards;
  }

  discard(cards) {
    this.pile.unshift(...cards);
  }

  get remaining() {
    return this.pile.length;
  }
}
