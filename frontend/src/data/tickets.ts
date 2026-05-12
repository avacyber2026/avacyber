import type { Ticket } from "@/types";

export const ticketsSimple: Ticket[] = [
  {
    id: 214305,
    title: "Logon from suspicious location",
    text: "Hello, \nSecurity Operations Center has detected suspicious activity related to your account/computer.\n\nWe have observed a sign-in to your work account from a new/unfamiliar location different from your primary location based on Active Directoty.\nThe sign-in has happened on 08.03.24 at 20:03:45 from Bogota, Colombia, IP 98.98.26.155. \n\nPlease, confirm whether you are aware of this activity, or whether you are not informed about any reason of signing-in from this location. \n\nThank you.",
    status: "New",
    priority: "Medium",
    fromUser: "security.analyst@secops.com",
    type: "Activity Verification",
    answer: "",
  },
  {
    id: 261560,
    title: "Computer infected with malware",
    text: "Hello, \nDuring regular operations activities Security Operations Center has detected unusual activity on your work computer. \n\nBased upon the results of our analysis we have observed an execution of malicious .vbs script on your computer, which led a communication to a malicious external IP. \n\nWe have found that the infection started from downloading a file.zip file from Google Drive link. However, it seems that this link was found by you from an email, because the file is password protected. \n\nSince we haven`t found any related email in your work email communication, we belive that this link was present in some of your personal emails, for exmaple Gmail or otehr email client. \n\nPlease, let us know if you are aware of any email communication as described above. We hope for your cooperation, which will help us to protect the company`s environment. \n\nThank you.",
    status: "New",
    priority: "High",
    fromUser: "security.analyst@secops.com",
    type: "Activity Verification",
    answer: "",
  },
  {
    id: 601529,
    title: "Powershell history log modification",
    text: "Hello, \nSecurity Operations Center has detected suspicious activity related to your account/computer. \n\nWith the release of PowerShell V5 on Windows 10 operating systems, all commands executed within a PowerShell session are stored to a user-specific history log on disk. While the ability to review previously executed commands is primarily designed to enhance user experience, the log file can also be hugely useful during forensic investigations. It enables incident responders to determine the exact commands executed during a malicious PowerShell session, which is generally a blind spot for EDR platforms. The modification of this log file by any process other than PowerShell itself would indicate that the file is being tampered with by an attacker in order to evade being detected during a forensic investigation. \n\nWe have observed a modification of Powershell history file on your work computer. Please, clarify if you are aware of such activity? \n\nThank you.",
    status: "New",
    priority: "Medium",
    fromUser: "security.analyst@secops.com",
    type: "Activity Verification",
    answer: "",
  },
  {
    id: 772789,
    title: "Invoice scam",
    text: "Hello, \n\nWe wish to bring to your attention that we have identified a security breach involving one of our client`s email accounts. It has come to our notice that unauthorized access was gained to their payroll email account, resulting in the submission of a manipulated invoice with a falsified IBAN number. \n\ne are asking you to be extra careful when working with any invoice coming from this client. Specifically, please exercise vigilance regarding communications from their standard finance email address, which has been compromised. \n\nThank you.",
    status: "New",
    priority: "High",
    fromUser: "security.analyst@secops.com",
    type: "Security Announcement",
    answer: "",
  },
];

export const ticketsPremium: Ticket[] = [
  {
    ...ticketsSimple[0],
    fromUser: "alinagaif99@gmail.com",
  },
  {
    ...ticketsSimple[1],
    fromUser: "alinagaif99@gmail.com",
  },
  {
    ...ticketsSimple[2],
    fromUser: "alinagaif99@gmail.com",
  },
  {
    ...ticketsSimple[3],
    fromUser: "alinagaif99@gmail.com",
  },
];
