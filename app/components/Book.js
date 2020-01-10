// @flow
import React, { Component } from 'react';

type Props = {
  title: string,
  cover: string
};

export default class Book extends Component<Props> {
  props: Props;

  render() {
    const { title, cover } = this.props;
    return (
      <div>
        {title} {cover}
      </div>
    );
  }
}
