import React from "react";

interface ILogoProps {
  height?: number;
  width?: number;
  src?: string;
}

const Logo: React.FC<ILogoProps> = ({ height = 48, width = 48, src }) => {
  return (
    <img style={{ height: height, width: width }} src={src ? src : "src/assets/logo.png"}></img>
  );
};

export default Logo;
