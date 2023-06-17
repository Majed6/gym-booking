import './App.css';
import {LocalizationProvider, StaticTimePicker} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {createTheme, ThemeProvider} from "@mui/material";
import dayjs from "dayjs";
import {useEffect, useState} from "react";


function App() {
    const [appState, updateAppState] = useState({
        id: localStorage.getItem('id')
            || localStorage.setItem('id', Math.random().toString(36).substring(7))
            || localStorage.getItem('id'),
        access_token: new URLSearchParams(window.location.search).get('access_token'),
        calendar_id: new URLSearchParams(window.location.search).get('calendar_id'),
        offHours: [0, 1, 2, 3, 4, 5, 6, 20, 21, 22, 23],
        bookings: [],
        myHours: [],
    })
    useEffect(() => {
        init().then((init) => {
            updateAppState({...appState, bookings: init.bookings, myHours: init.myHours})
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateAppState]);
    const init = async () => {
        const gymEvents = await (await fetch(`https://api.nylas.com/events?limit=5`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.access_token}`
            },
        })).json();
        const bookings = gymEvents.reduce((acc, event) => {
            const startTime = dayjs(event.when.start_time * 1000);
            const today = dayjs();
            if (today.isSame(startTime, 'day')) {
                acc.push({
                    "title": event.title,
                    "hour": dayjs(startTime).hour()
                });
            }
            return acc;
        }, []);
        return {
            "bookings": bookings.map((booking) => booking.hour),
            "myHours": bookings.reduce((acc, booking) => {
                if (booking.title === appState.id) {
                    acc.push(booking.hour);
                }
                return acc;
            }, [])
        }
    };
    const createBooking = (START_TIME) => {
        fetch("https://api.nylas.com/events", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.access_token}`
            },
            body: JSON.stringify({
                title: appState.id,
                calendar_id: appState.calendar_id,
                when: {
                    start_time: START_TIME,
                    end_time: START_TIME + 60 * 60
                },
            })
        })
            .then(response => response.json())
            .then(event => {
                console.log(`Event created with ID: ${event.id}`);
            });
    }
    const theme = createTheme({
        components: {
            // Name of the component
            MuiClockNumber: {
                styleOverrides: {
                    root: ({ownerState}) => ({
                        ...(appState.myHours.includes(ownerState.index) &&
                            {
                                backgroundColor: '#bbdefb',
                            }),
                    }),
                },
            },
        },
    });

    return (
        <div className="App">
            <ThemeProvider theme={theme}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <StaticTimePicker disablePast={true} ampm={false}
                                      views={['hours']}
                                      shouldDisableTime={(value, view) => {
                                          return appState.bookings.includes(value.hour())
                                              || appState.offHours.includes(value.hour());
                                      }}
                                      onAccept={(value) => {
                                          createBooking(value.unix())
                                      }}
                    />
                </LocalizationProvider>
            </ThemeProvider>
        </div>
    );
}

export default App;
