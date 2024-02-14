import { MailerService } from '@nestjs-modules/mailer/dist';
import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AppLogger } from 'src/monitrix-auth/logger/app-logger.service';
import { QueueMailDto } from './queue-mail.dto';

@Processor('monitrix-mail')
export class QueueMailConsumer {
  private readonly _logger = new Logger(QueueMailConsumer.name);
  constructor(
    private mailerService: MailerService,
    private readonly appLogger: AppLogger,
  ) {}

  @OnQueueActive()
  public onActive(job: Job) {
    this._logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job) {
    this._logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any) {
    this._logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }

  @Process('mail-job')
  async readOperationJob(job: Job<QueueMailDto>) {
    if (job.data.template) {
      const overrideContext = job.data.context;
      overrideContext.CDN_LINK = process.env.PUBLIC_CDN;
      this.mailerService
        .sendMail({
          to: job.data.toMail,
          replyTo: job.data.replyTo ?? job.data.fromMail,
          from: job.data.fromMail ?? `"Monitrix" <${process.env.MAIL_FROM}>`, // override default from '"Support Team" <support@example.com>'
          subject: job.data.subject,
          template: `${job.data.template}`, //'./confirmation', // `.hbs` extension is appended automatically
          context: overrideContext, //context object
        })
        .then((res) => {
          this.appLogger.log('Mail Sent Successfully!');
          this.appLogger.log(`Mail Response : ${res.messageId}`);
          return res.messageId;
        })
        .catch((err) => {
          this.appLogger.log(err);
          return false;
        });
    } else {
      this.mailerService
        .sendMail({
          to: job.data.toMail,
          replyTo: job.data.replyTo ?? job.data.fromMail,
          from: job.data.fromMail ?? `"Monitrix" <${process.env.MAIL_FROM}>`, // override default from '"Support Team" <support@example.com>'
          subject: job.data.subject,
          html: job.data.bodyHTML,
        })
        .then((res) => {
          this.appLogger.log('Mail Sent Successfully!');
          this.appLogger.log(`Mail Response : ${res.messageId}`);
          return res.messageId;
        })
        .catch((err) => {
          this.appLogger.log(err);
          return false;
        });
    }
  }
}
