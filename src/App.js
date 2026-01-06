import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import './App.css';

const DEFAULT_QUOTES = [
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Life is what happens when you're busy making other plans.",
  "The only way to do great work is to love what you do.",
  "Your time is limited, don't waste it living someone else's life.",
  "Believe you can and you're halfway there.",
  "Success is not final, failure is not fatal: It is the courage to continue that counts.",
  "You miss 100% of the shots you don't take.",
  "Dream big and dare to fail.",
];

const Header = ({ user }) => {
  const handleLogout = () => signOut(auth);

  return (
    <div className="header">
      <div className="welcome-header">Welcome, {user?.displayName || user?.email}</div>
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab }) => {
  const tabs = ['Personal', 'Work', 'Study'];
  return (
    <div className="sidebar">
      <h3>Contexts</h3>
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </div>
      ))}
      <div className="sidebar-item" onClick={() => setActiveTab('Deleted')}>
        Deleted
      </div>
    </div>
  );
};

const DayView = ({ events, addEvent, updateEvent, softDeleteEvent }) => {
  const [draft, setDraft] = useState({ title: '', description: '', date: '' });

  const handleAdd = () => {
    if (!draft.title || !draft.date) return;
    addEvent(draft);
    setDraft({ title: '', description: '', date: '' });
  };

  return (
    <div className="day-view">
      <h2>Day View</h2>
      {events.map((event) => (
        <div key={event.id} className="event-item">
          <input
            value={event.title}
            onChange={(e) => updateEvent(event.id, { title: e.target.value })}
          />
          <textarea
            value={event.description}
            onChange={(e) => updateEvent(event.id, { description: e.target.value })}
          />
          <input
            type="date"
            value={event.date || ''}
            onChange={(e) => updateEvent(event.id, { date: e.target.value })}
          />
          <button onClick={() => softDeleteEvent(event.id)}>Delete</button>
        </div>
      ))}
      <div className="event-item">
        <h4>Add Event</h4>
        <input
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          placeholder="Description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
        />
        <button onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
};

const UpcomingPanel = ({ upcomingEvents }) => (
  <div className="upcoming-panel">
    <h3>Upcoming</h3>
    <ul>
      {upcomingEvents.map((event) => (
        <li key={event.id}>
          {event.title} — {event.date}
        </li>
      ))}
    </ul>
  </div>
);

const QuotesModule = ({ quotes }) => {
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], [quotes]);
  return (
    <div className="quotes-module">
      <h3>Motivational Quote</h3>
      <p>{quote}</p>
    </div>
  );
};

const TagsManagement = ({ tags, addTag, updateTag, deleteTag }) => {
  const [newTag, setNewTag] = useState('');

  const handleAdd = () => {
    if (!newTag.trim()) return;
    addTag({ name: newTag.trim() });
    setNewTag('');
  };

  return (
    <div className="tags-management">
      <h3>Tags</h3>
      {tags.map((tag) => (
        <div key={tag.id} className="tag-item">
          <input
            value={tag.name}
            onChange={(e) => updateTag(tag.id, { name: e.target.value })}
          />
          <button onClick={() => deleteTag(tag.id)}>Delete</button>
        </div>
      ))}
      <input
        placeholder="New tag"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
      />
      <button onClick={handleAdd}>Add Tag</button>
    </div>
  );
};

const DeletedEvents = ({ deletedEvents, recoverEvent, permanentDeleteEvent }) => (
  <div className="deleted-events">
    <h3>Deleted Events</h3>
    {deletedEvents.map((event) => (
      <div key={event.id} className="event-item">
        <h4>{event.title}</h4>
        <p>{event.description}</p>
        <p>{event.date}</p>
        <button onClick={() => recoverEvent(event.id)}>Recover</button>
        <button onClick={() => permanentDeleteEvent(event.id)}>Delete forever</button>
      </div>
    ))}
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div className="error">{error}</div>}
      <button onClick={handleAuth}>{isRegister ? 'Register' : 'Login'}</button>
      <button onClick={() => setIsRegister(!isRegister)}>
        Switch to {isRegister ? 'Login' : 'Register'}
      </button>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Personal');
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', user.uid),
      where('context', '==', activeTab.toLowerCase()),
      where('deleted', '==', false),
    );
    const deletedQuery = query(
      collection(db, 'events'),
      where('userId', '==', user.uid),
      where('deleted', '==', true),
    );
    const tagsQuery = query(collection(db, 'tags'), where('userId', '==', user.uid));

    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(eventList);
      setUpcomingEvents(eventList.filter((e) => new Date(e.date) > new Date()));
    });

    const unsubDeleted = onSnapshot(deletedQuery, (snapshot) => {
      setDeletedEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTags = onSnapshot(tagsQuery, (snapshot) => {
      setTags(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubEvents();
      unsubDeleted();
      unsubTags();
    };
  }, [user, activeTab]);

  const addEvent = async (event) => {
    if (!user) return;
    await addDoc(collection(db, 'events'), {
      ...event,
      userId: user.uid,
      deleted: false,
      context: activeTab.toLowerCase(),
    });
  };

  const updateEvent = async (id, payload) => updateDoc(doc(db, 'events', id), payload);
  const softDeleteEvent = async (id) => updateDoc(doc(db, 'events', id), { deleted: true });
  const recoverEvent = async (id) => updateDoc(doc(db, 'events', id), { deleted: false });
  const permanentDeleteEvent = async (id) => deleteDoc(doc(db, 'events', id));

  const addTag = async (tag) => addDoc(collection(db, 'tags'), { ...tag, userId: user?.uid });
  const updateTag = async (id, payload) => updateDoc(doc(db, 'tags', id), payload);
  const deleteTag = async (id) => deleteDoc(doc(db, 'tags', id));

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-container">
        <Header user={user} />
        <div className="layout">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="main-content">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <DayView
                      events={events}
                      addEvent={addEvent}
                      updateEvent={updateEvent}
                      softDeleteEvent={softDeleteEvent}
                    />
                    <UpcomingPanel upcomingEvents={upcomingEvents} />
                    <QuotesModule quotes={DEFAULT_QUOTES} />
                    <TagsManagement
                      tags={tags}
                      addTag={addTag}
                      updateTag={updateTag}
                      deleteTag={deleteTag}
                    />
                  </>
                }
              />
              <Route
                path="/deleted"
                element={
                  <DeletedEvents
                    deletedEvents={deletedEvents}
                    recoverEvent={recoverEvent}
                    permanentDeleteEvent={permanentDeleteEvent}
                  />
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
