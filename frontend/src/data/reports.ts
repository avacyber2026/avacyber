import type { ReportItem } from "@/types";

export const reportsData: ReportItem[] = [
  {
    id: "r965907",
    subject: "I have forgot my laptop",
    description:
      "Hello, \nI have accidently forgot my work laptop somewhere in the airport, when I was on a business trip.  \nCan you please remotely block my laptop and deploy the bit lock recovery key, so nobody else can access my device?\nThank you.",
    fromUser: "alinagaif99@gmail.com",
    status: true,
    answerUser: "security.analyst@secops.com",
  },
  {
    id: "r404388",
    subject: "Can`t receive emails from a client",
    description:
      "Hello, \nI have one client who is trying to send me emails, but I can`t receive them. Can you please put the sender domain of this client to a allow-list, so I can start receiving his emails? \nThank you.",
    fromUser: "alinagaif99@gmail.com",
    status: false,
    answerUser: "",
  },
];
