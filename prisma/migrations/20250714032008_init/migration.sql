-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sub_status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "rawResponse" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_key" ON "PaymentAttempt"("paymentId");
