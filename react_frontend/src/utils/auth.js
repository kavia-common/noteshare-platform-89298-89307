export const handleAuthError = (error, routerPush) => {
  // eslint-disable-next-line no-console
  console.error('Authentication error:', error);

  const message = (error?.message || '').toLowerCase();

  if (message.includes('redirect')) {
    routerPush?.('/auth/error?type=redirect');
  } else if (message.includes('email')) {
    routerPush?.('/auth/error?type=email');
  } else {
    routerPush?.('/auth/error');
  }
};
