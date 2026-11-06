# A local copy of the Let's RP wiki's setup, for testing imports before they go live:
# MediaWiki 1.46.2 + Citizen 3.25.1 + TabberNeue 4.1.0 + ShortDescription 4.0.2,
# plus the extensions that come with MediaWiki.
FROM mediawiki:1.46.2

RUN git clone --quiet --depth 1 --branch v3.25.1 \
		https://github.com/StarCitizenTools/mediawiki-skins-Citizen.git skins/Citizen \
	&& git clone --quiet --depth 1 --branch v4.1.0 \
		https://github.com/StarCitizenTools/mediawiki-extensions-TabberNeue.git extensions/TabberNeue \
	&& git clone --quiet https://github.com/StarCitizenTools/mediawiki-extensions-ShortDescription.git extensions/ShortDescription \
	&& git -C extensions/ShortDescription checkout --quiet 3d9eaf752119 \
	&& rm -rf skins/Citizen/.git extensions/TabberNeue/.git extensions/ShortDescription/.git

COPY extra-settings.php /setup/extra-settings.php
COPY start.sh /setup/start.sh
RUN sed -i 's/\r$//' /setup/start.sh /setup/extra-settings.php && chmod +x /setup/start.sh

CMD ["/setup/start.sh"]
