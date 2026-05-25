import { ToastContainer } from "react-toastify";
import FaucetForm from "./components/FaucetForm";
import Contribute from "./components/Contribute";
import ToggleTheme from "./components/ToggleTheme";

import axios, { config } from "./configure";
import "./App.css";
import "./styleConfig";

import { createContext, useState, SetStateAction, Dispatch } from "react";
type Context = {
  theme: string;
  toggleTheme: Dispatch<SetStateAction<Context>>;
};

const initialState: Context = {
  theme: "",
  toggleTheme: (): void => {
    throw new Error("toggleTheme function must be overridden");
  },
};

export const ThemeContext = createContext(initialState);
function App() {
  const [theme, setTheme] = useState("dark");
  const toggleTheme = () => {
    setTheme((curr) => (curr === "light" ? "dark" : "light"));
  };
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="app" id={theme}>
        <ToastContainer/>
        <FaucetForm axios={axios} config={config} />
        {/*<Contribute /> */}
{/*         <ToggleTheme theme={theme} setTheme={toggleTheme} /> */}
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
