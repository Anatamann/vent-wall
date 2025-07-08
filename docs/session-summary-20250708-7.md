I have updated the `VentCard` component to display the timestamp in `DD-MM-YYYY` format instead of relative time. The following changes were made:

- Changed the `date-fns` import from `formatDistanceToNow` to `format`.
- Modified the date formatting logic to use `format(new Date(vent.created_at), 'dd-MM-yyyy')`.
- Updated the JSX to display the `formattedDate` variable.