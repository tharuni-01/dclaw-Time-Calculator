from app.schemas.time_calculator import SessionTotal


def calculate_total(entries: list) -> SessionTotal:
    total_seconds = 0
    for entry in entries:
        h = entry.hours if hasattr(entry, "hours") else entry["hours"]
        m = entry.minutes if hasattr(entry, "minutes") else entry["minutes"]
        s = entry.seconds if hasattr(entry, "seconds") else entry["seconds"]
        op = entry.operation if hasattr(entry, "operation") else entry["operation"]
        entry_seconds = h * 3600 + m * 60 + s
        if op == "add":
            total_seconds += entry_seconds
        else:
            total_seconds -= entry_seconds

    is_negative = total_seconds < 0
    abs_secs = abs(total_seconds)
    hours = abs_secs // 3600
    minutes = (abs_secs % 3600) // 60
    seconds = abs_secs % 60
    sign = "-" if is_negative else ""
    formatted = f"{sign}{hours:02d}:{minutes:02d}:{seconds:02d}"

    return SessionTotal(
        total_seconds=total_seconds,
        is_negative=is_negative,
        hours=hours,
        minutes=minutes,
        seconds=seconds,
        formatted=formatted,
    )
