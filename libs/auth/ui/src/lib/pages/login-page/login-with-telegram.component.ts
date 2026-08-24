import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, OnInit, inject, ChangeDetectionStrategy, input } from '@angular/core';
import {
  ITelegramAuthData,
  SneatAuthWithTelegramService,
} from './sneat-auth-with-telegram.service';
import {
  TelegramLoginConfig,
  resolveTelegramBotID,
} from './telegram-login-config';

let authWithTelegramService: SneatAuthWithTelegramService;

@Component({
  providers: [SneatAuthWithTelegramService],
  selector: 'sneat-login-with-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!--
				<script
					async
					src="https://telegram.org/js/telegram-widget.js?22"
					data-telegram-login="SneatBot"
					data-size="large"
					data-onauth="onTelegramAuth(user)"
					data-request-access="write"
				></script>
				-->
  `,
})
export class LoginWithTelegramComponent implements OnInit {
  private readonly el = inject(ElementRef);
  private readonly document = inject<Document>(DOCUMENT);
  readonly authWithTelegram = inject(SneatAuthWithTelegramService);
  private readonly telegramLoginConfig = inject(TelegramLoginConfig, {
    optional: true,
  });

  // TODO: Article about Telegram login
  constructor() {
    const authWithTelegram = this.authWithTelegram;

    authWithTelegramService = authWithTelegram;
  }

  public readonly isUserAuthenticated = input(false);

  public readonly botID = input<string>(resolveTelegramBotID(this.telegramLoginConfig, location.hostname));

  public readonly size = input<'small' | 'medium' | 'large'>('large');
  public readonly requestAccess = input<'write' | 'read'>('write');
  public readonly userPic = input(true);

  ngOnInit() {
    const botID = this.botID();
    if (botID) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.onTelegramAuth = (tgAuthData: ITelegramAuthData) => {
        // https://core.telegram.org/widgets/login#receiving-authorization-data
        // After a successful authorization, the widget returns data
        // by calling the callback function data-onauth with the JSON-object containing
        // id, first_name, last_name, username, photo_url, auth_date and hash fields.
        authWithTelegramService.loginWithTelegram(
          botID,
          tgAuthData,
          this.isUserAuthenticated(),
        );
      };

      const script = this.document.createElement('script');

      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botID);
      script.setAttribute('data-request-access', this.requestAccess());
      script.setAttribute('data-size', this.size());
      if (!this.userPic()) {
        script.setAttribute('data-userpic', 'false');
      }
      // https://core.telegram.org/widgets/login#receiving-authorization-data
      // After a successful authorization, the widget returns data
      // by calling the callback function data-onauth with the JSON-object containing
      // id, first_name, last_name, username, photo_url, auth_date and hash fields.
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      this.el.nativeElement.appendChild(script);
    }
  }
}
