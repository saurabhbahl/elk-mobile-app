import { Href, Link, router } from 'expo-router';
import { type ComponentProps } from 'react';
import { handleLinkPress } from '../utils/linkUtils';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={(event) => {
        event.preventDefault();
        handleLinkPress(href, router);
      }}
    />
  );
}

