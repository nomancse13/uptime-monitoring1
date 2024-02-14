export class QueueMailDto {
  toMail: string;
  fromMail: string;
  replyTo: string;
  url: string;
  template: string;
  subject: string;
  title: string;
  token: string;
  bodyHTML: string;
  bodyJson: any;
  others: any;
  context: any;
}
