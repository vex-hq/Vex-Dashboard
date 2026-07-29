'use client';

import { useCaptureException } from '@kit/monitoring/hooks';

import { ErrorPageContent } from '~/components/error-page-content';

/**
 * Error boundary for the whole account section.
 *
 * Every page under /home/[account] reads the engine database, and until this
 * file existed a single failed connection (a cold Neon resume, a network blip)
 * escalated to the root error page — to a user, "the app crashed". This keeps
 * the shell standing and offers a retry, which for connection-class failures
 * usually succeeds because the first attempt is what woke the database.
 */
const TeamAccountErrorPage = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useCaptureException(error);

  return (
    <div className={'flex flex-1 flex-col'}>
      <ErrorPageContent
        statusCode={'common:errorPageHeading'}
        heading={'common:genericError'}
        subtitle={'common:genericErrorSubHeading'}
        backLabel={'common:goBack'}
        reset={reset}
      />
    </div>
  );
};

export default TeamAccountErrorPage;
