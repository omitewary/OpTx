import { triangleInputHanler } from "optx-input-handler";
// Assumptions:
// 1. M is the no.of rows
// 2. M<=no of column in triangle <= N
const generateTriangle = (M, N) => {
  const isCentered = N === M * 2 - 1;
  for (let i = 1; i <= M; i++) {
    if (isCentered)
      console.log(" ".repeat((N - (i * 2 - 1)) / 2) + "*".repeat(i * 2 - 1));
    else console.log("*".repeat(Math.min(i, N)));
  }
};

triangleInputHanler(generateTriangle);
