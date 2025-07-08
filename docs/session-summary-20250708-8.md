I have reverted the `VentCard` component to display the timestamp as time distance to the current date. The following changes were made:

- Changed the `date-fns` import from `format` back to `formatDistanceToNow`.
- Modified the date formatting logic to use `formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })`.
- Updated the JSX to display the `timeAgo` variable.