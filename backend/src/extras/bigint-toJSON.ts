declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function (): string {
  return (this as bigint).toString() + "n";
};

export { };

